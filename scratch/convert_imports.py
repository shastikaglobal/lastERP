import re
import os
import sys

# Set encoding to utf-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

SRC_DIR = r"d:\swanethkaruerp\nethramerge\src"
APP_TSX_PATH = os.path.join(SRC_DIR, "App.tsx")

# We want to match:
# import Name from "./pages/Path"
# import Name from "@/pages/Path"
# import Name from "./pages/Path.tsx"
# Let's write a regex that matches these line by line.
IMPORT_REGEX = re.compile(r'^import\s+(\w+)\s+from\s+["\']((\.|\@)/pages/[^"\']+)["\'];?\s*$', re.MULTILINE)

def resolve_file_path(import_path):
    # import_path is like ./pages/crm/Activities or @/pages/crm/Activities
    rel_path = import_path.replace("@/pages/", "pages/").replace("./pages/", "pages/")
    
    # Try extensions
    extensions = [".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"]
    for ext in extensions:
        test_path = os.path.join(SRC_DIR, rel_path.replace("/", "\\") + ext)
        if os.path.exists(test_path):
            return test_path
        # Also try if the extension was already present in the import path
        if import_path.endswith(ext):
            test_path_direct = os.path.join(SRC_DIR, rel_path.replace("/", "\\"))
            if os.path.exists(test_path_direct):
                return test_path_direct
    return None

def check_default_export(file_path):
    if not file_path:
        return False, "File not found"
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
            # Simple check for export default
            if "export default" in content:
                return True, None
            else:
                return False, "No 'export default' found in file"
    except Exception as e:
        return False, f"Error reading file: {str(e)}"

def main():
    print("Reading App.tsx...")
    with open(APP_TSX_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # Find matches
    matches = list(IMPORT_REGEX.finditer(content))
    print(f"Found {len(matches)} page imports to convert.")

    warnings = []
    converted_imports = []

    # Map of page name -> import statement replacement
    replacements = {}

    for match in matches:
        full_line = match.group(0)
        component_name = match.group(1)
        import_path = match.group(2)

        # Resolve path
        resolved = resolve_file_path(import_path)
        if resolved:
            has_default, err = check_default_export(resolved)
            if not has_default:
                warnings.append((component_name, import_path, resolved, err))
        else:
            warnings.append((component_name, import_path, "COULD NOT RESOLVE", "Path check skipped"))

        # Prepare lazy import replacement
        # const ComponentName = lazy(() => import("import_path"));
        lazy_line = f'const {component_name} = lazy(() => import("{import_path}"));'
        replacements[full_line] = lazy_line

    print("\n--- NON-DEFAULT EXPORTS OR MISSING FILES DETECTED ---")
    if warnings:
        for name, path, resolved, err in warnings:
            print(f"Warning: Component '{name}' (import '{path}')")
            print(f"  Reason: {err}")
            print(f"  File: {resolved}")
            print("-" * 50)
    else:
        print("None! All pages resolved and have 'export default'.")

    # Let's perform replacements in App.tsx content
    new_content = content
    for old_line, new_line in replacements.items():
        new_content = new_content.replace(old_line, new_line)

    # Let's also check if 'lazy' is imported from 'react'
    # The first line is: import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
    # We want to import lazy and Suspense from "react"
    # Let's see if we import React or anything from "react" already.
    # In App.tsx:
    # "import { QueryClient, QueryClientProvider } from "@tanstack/react-query";"
    # Let's add: import { Suspense, lazy } from "react"; at the top if not present.
    if 'import { Suspense, lazy }' not in new_content and 'import { lazy, Suspense }' not in new_content:
        new_content = 'import { Suspense, lazy } from "react";\n' + new_content

    # Let's add the Suspense wrapper to the Routes block
    # Search for '<Routes>' and '</Routes>'
    # We will wrap it like:
    # <Suspense fallback={<DelayedLoader />}>
    #   <Routes>
    #   ...
    #   </Routes>
    # </Suspense>
    # And we also need to import DelayedLoader
    # Let's add: import { DelayedLoader } from "@/components/ui/DelayedLoader";
    if 'import DelayedLoader' not in new_content and 'import { DelayedLoader }' not in new_content:
        new_content = 'import DelayedLoader from "@/components/ui/DelayedLoader";\n' + new_content

    # Wrap <Routes>
    # We can replace `<Routes>` with `<Suspense fallback={<DelayedLoader />}>\n          <Routes>`
    # and `</Routes>` with `</Routes>\n          </Suspense>`
    if '<Suspense' not in new_content:
        new_content = new_content.replace("<Routes>", "<Suspense fallback={<DelayedLoader />}>\n          <Routes>")
        new_content = new_content.replace("</Routes>", "</Routes>\n          </Suspense>")

    # Save to a new scratch file first to verify, then we can overwrite App.tsx
    output_path = os.path.join(SRC_DIR, "App.tsx.converted")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"\nConversion simulation completed. Wrote result to {output_path}")

if __name__ == "__main__":
    main()
