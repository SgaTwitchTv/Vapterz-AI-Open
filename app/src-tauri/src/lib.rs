use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{fs, path::{Path, PathBuf}, process::Command, time::{SystemTime, UNIX_EPOCH}};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppContextResponse { repository_root: String, engine_root: String, python_path: String, project_root: String, desktop_available: bool }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProjectSummary { name: String, path: String, source_name: String, source_type: String, updated_label: String, artifact_count: usize, status: String }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ArtifactItem { name: String, path: String, category: String, extension: String, size_label: String }

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EngineRunRequest {
    kind: String, input_path: String, project_path: Option<String>, output_name: Option<String>,
    scale: f64, add_layers: Vec<String>, output_format: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EngineRunResult { run_id: String, success: bool, exit_code: i32, project_path: String, primary_output: String, colored_output: Option<String>, log_path: Option<String>, message: String }

fn root() -> Result<PathBuf, String> {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().and_then(Path::parent).map(Path::to_path_buf).ok_or_else(|| "cannot resolve repository root".into())
}
fn engine() -> Result<PathBuf, String> { Ok(root()?.join("engine")) }
fn projects() -> Result<PathBuf, String> { Ok(root()?.join("workspace").join("projects")) }
fn python() -> String { std::env::var("VAPTERZ_PYTHON").unwrap_or_else(|_| "python".into()) }
fn text(path: &Path) -> String { path.to_string_lossy().to_string() }
fn now() -> u128 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() }
fn safe_stem(path: &Path) -> String { path.file_stem().unwrap_or_default().to_string_lossy().chars().map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '_' { c } else { '_' }).collect() }

fn run_cli(args: &[String]) -> Result<Value, String> {
    let output = Command::new(python()).current_dir(engine()?).args(["-m", "vapterz_open.cli"]).args(args).output().map_err(|e| e.to_string())?;
    if !output.status.success() { return Err(String::from_utf8_lossy(&output.stderr).trim().to_string()); }
    serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_app_context() -> Result<AppContextResponse, String> {
    Ok(AppContextResponse { repository_root: text(&root()?), engine_root: text(&engine()?), python_path: python(), project_root: text(&projects()?), desktop_available: true })
}

#[tauri::command]
fn inspect_cad_layers(input_path: String, manual_only: Option<bool>) -> Result<Value, String> {
    let _ = manual_only;
    run_cli(&["inspect-dxf".into(), "--input".into(), input_path])
}

#[tauri::command]
fn run_engine(request: EngineRunRequest) -> Result<EngineRunResult, String> {
    let input = PathBuf::from(&request.input_path);
    if !input.is_file() { return Err("input file does not exist".into()); }
    let project = request.project_path.filter(|p| !p.is_empty()).map(PathBuf::from).unwrap_or_else(|| projects().unwrap().join(format!("{}_{}", safe_stem(&input), now())));
    let output_dir = project.join("output");
    fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;
    let name = request.output_name.filter(|s| !s.trim().is_empty()).unwrap_or_else(|| format!("{}_open", safe_stem(&input)));
    let output = output_dir.join(format!("{}.svg", name.trim_end_matches(".svg")));
    let args = if request.kind == "raster" {
        vec!["raster".into(), "--input".into(), request.input_path.clone(), "--output".into(), text(&output), "--enhanced-output".into(), text(&output_dir.join("enhanced.png")), "--scale".into(), request.scale.to_string()]
    } else {
        let mut values = vec!["cad".into(), "--input".into(), request.input_path.clone(), "--output".into(), text(&output)];
        for layer in &request.add_layers { values.extend(["--layer".into(), layer.clone()]); }
        values
    };
    if request.kind == "vector" && request.output_format == "dxf" { return Err("The public demo exports selected CAD layers to SVG only.".into()); }
    let payload = run_cli(&args)?;
    let source_dir = project.join("source");
    fs::create_dir_all(&source_dir).map_err(|e| e.to_string())?;
    let _ = fs::copy(&input, source_dir.join(input.file_name().unwrap_or_default()));
    Ok(EngineRunResult { run_id: format!("{}-{}", request.kind, now()), success: true, exit_code: 0, project_path: text(&project), primary_output: text(&output), colored_output: None, log_path: None, message: format!("Public demo completed: {}", payload) })
}

#[tauri::command]
fn read_preview(path: String) -> Result<String, String> {
    let file = PathBuf::from(path);
    let ext = file.extension().unwrap_or_default().to_string_lossy().to_ascii_lowercase();
    let mime = match ext.as_str() { "png" => "image/png", "jpg" | "jpeg" => "image/jpeg", "svg" => "image/svg+xml", _ => return Err("unsupported preview format".into()) };
    Ok(format!("data:{};base64,{}", mime, BASE64.encode(fs::read(file).map_err(|e| e.to_string())?)))
}

#[tauri::command]
fn list_projects() -> Result<Vec<ProjectSummary>, String> {
    let root = projects()?; if !root.exists() { return Ok(vec![]); }
    let mut result = vec![];
    for entry in fs::read_dir(root).map_err(|e| e.to_string())?.flatten() {
        if !entry.path().is_dir() { continue; }
        let source = fs::read_dir(entry.path().join("source")).ok().and_then(|mut it| it.next()).and_then(Result::ok).map(|e| e.file_name().to_string_lossy().to_string()).unwrap_or_default();
        let source_type = Path::new(&source).extension().unwrap_or_default().to_string_lossy().to_string();
        let artifacts = fs::read_dir(entry.path().join("output")).map(|it| it.count()).unwrap_or(0);
        result.push(ProjectSummary { name: entry.file_name().to_string_lossy().to_string(), path: text(&entry.path()), source_name: source, source_type, updated_label: "Local showcase".into(), artifact_count: artifacts, status: "ready".into() });
    }
    Ok(result)
}

#[tauri::command]
fn list_artifacts(project_path: String) -> Result<Vec<ArtifactItem>, String> {
    let mut result = vec![];
    for entry in fs::read_dir(PathBuf::from(project_path).join("output")).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path(); if !path.is_file() { continue; }
        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
        result.push(ArtifactItem { name: entry.file_name().to_string_lossy().to_string(), path: text(&path), category: "Output".into(), extension: path.extension().unwrap_or_default().to_string_lossy().to_string(), size_label: format!("{} KB", (size + 1023) / 1024) });
    }
    Ok(result)
}

#[tauri::command]
fn open_local_path(path: String) -> Result<(), String> { tauri_plugin_opener::open_path(path, None::<&str>).map_err(|e| e.to_string()) }

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default().plugin(tauri_plugin_dialog::init()).plugin(tauri_plugin_opener::init()).invoke_handler(tauri::generate_handler![get_app_context, inspect_cad_layers, run_engine, read_preview, list_projects, list_artifacts, open_local_path]).run(tauri::generate_context!()).expect("error running Vapterz AI Open");
}
