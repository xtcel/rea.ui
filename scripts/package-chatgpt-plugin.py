#!/usr/bin/env python3
"""Build a separate public-upload draft; never treat missing review facts as passed."""
import argparse
import json
from pathlib import Path
import shutil
import struct
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "integrations/codex/reaui-designer"
METADATA = ROOT / "integrations/chatgpt/submission.json"


def merge(target, overlay):
    for key, value in overlay.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            merge(target[key], value)
        else:
            target[key] = value


def inspect(root):
    manifest = json.loads((root / "plugin.json").read_text())
    assert not (root / ".app.json").exists(), "Public uploads cannot contain .app.json"
    for file in root.rglob("plugin.json"):
        data = json.loads(file.read_text())
        assert data.get("apps") is None, file
        assert data.get("extensions", {}).get("com.openai", {}).get("apps") is None, file
    assert manifest["name"] == "reaui-designer"
    settings = manifest["extensions"]["com.openai"]
    interface = settings["interface"]
    for key, limit in [("displayName", 30), ("shortDescription", 30), ("longDescription", 4000), ("developerName", 80)]:
        assert 0 < len(interface[key]) <= limit, key
    assert interface["category"] == "Creativity"
    prompts = interface["defaultPrompt"]
    assert 1 <= len(prompts) <= 3
    assert len(set(" ".join(p.split()) for p in prompts)) == len(prompts)
    assert all(p.strip() and len(p) <= 128 and "\n" not in p for p in prompts)
    for key, minimum in [("logo", 256), ("composerIcon", 48)]:
        icon = (root / interface[key]).resolve()
        assert icon.is_relative_to(root.resolve()), key
        raw = icon.read_bytes()
        assert raw[:8] == b"\x89PNG\r\n\x1a\n" and len(raw) <= 5 * 1024 * 1024, key
        width, height = struct.unpack(">II", raw[16:24])
        assert minimum <= width == height <= 4096, key
    cases = settings["review"]["test_cases"]
    assert len(cases["positive"]) == 5 and len(cases["negative"]) == 3
    for kind, values in cases.items():
        required = ["description", "prompt"] + (["tools_triggered", "expected_behavior"] if kind == "positive" else [])
        assert all(isinstance(c.get(k), str) and c[k].strip() for c in values for k in required)
    server = json.loads((root / "mcp.json").read_text())["mcpServers"]["reaui"]
    assert server["type"] == "stdio" and server["command"] == "node"
    assert server["cwd"] == "${PLUGIN_ROOT}"
    assert (root / server["args"][0].replace("${PLUGIN_ROOT}/", "")).is_file()
    gaps = [f"Missing listing URL: {k}" for k in ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"] if not interface.get(k)]
    # Presence cannot establish public accessibility, publisher verification, or review success.
    gaps += ["Verified individual publishing identity", "Local MCP organization allowlist confirmation",
             "Verified hosted demo recording", "Clean ChatGPT desktop installation and 8 host review cases",
             "Portal scans and developer-completed legal/policy attestations"]
    return manifest, gaps


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, default=ROOT / "dist/chatgpt")
    args = parser.parse_args()
    output = args.out.resolve()
    assert not output.is_relative_to(SOURCE.resolve()), "Archive must be outside the plugin"
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="reaui-public-upload-") as temp:
        staged = Path(temp) / "reaui-designer"
        assert not any(p.is_symlink() for p in SOURCE.rglob("*")), "Symlinks are not allowed"
        shutil.copytree(SOURCE, staged, ignore=shutil.ignore_patterns(".git", ".gitignore", ".DS_Store", "node_modules", "designs"))
        manifest = json.loads((staged / "plugin.json").read_text())
        merge(manifest, json.loads(METADATA.read_text()))
        (staged / "plugin.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        _, gaps = inspect(staged)
        archive = output / f"reaui-designer-{manifest['version']}-submission-draft.zip"
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
            for file in sorted(staged.rglob("*")):
                if file.is_file():
                    bundle.write(file, file.relative_to(staged.parent))
        # Inspect the bytes that will actually be uploaded, not only the staging tree.
        extracted = Path(temp) / "verified"
        with zipfile.ZipFile(archive) as bundle:
            assert bundle.testzip() is None
            bundle.extractall(extracted)
            count = len(bundle.namelist())
        inspect(extracted / "reaui-designer")
        evidence_path = output / "public-url-evidence.json"
        url_evidence = json.loads(evidence_path.read_text()) if evidence_path.exists() else []
        verified_urls = {item["url"] for item in url_evidence if item.get("contentVerified") is True and item.get("status") == 200 and item.get("authentication") == "none"}
        for field in ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]:
            value = manifest["extensions"]["com.openai"]["interface"].get(field)
            if value and value not in verified_urls:
                gaps.append(f"Unverified listing URL: {field}")
        report = {"archive": str(archive), "files": count, "packageChecks": "passed", "submissionReady": False, "verifiedPublicURLs": sorted(verified_urls), "remaining": gaps}
        (output / "readiness.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
