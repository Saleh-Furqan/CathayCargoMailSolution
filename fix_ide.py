#!/usr/bin/env python3
"""
IDE Configuration Fix Script
Run this to fix Python import issues in your IDE
"""

import os
import json
import sys

def create_vscode_settings():
    """Create VS Code settings for Python"""
    vscode_dir = ".vscode"
    os.makedirs(vscode_dir, exist_ok=True)
    
    settings = {
        "python.defaultInterpreterPath": "./backend/venv/bin/python3",
        "python.analysis.extraPaths": ["./backend/src"],
        "python.terminal.activateEnvironment": True,
        "python.analysis.autoSearchPaths": True,
        "python.analysis.typeCheckingMode": "off",
        "python.envFile": "${workspaceFolder}/backend/.env",
        "files.exclude": {
            "**/venv": True,
            "**/__pycache__": True,
            "**/node_modules": True
        }
    }
    
    with open(os.path.join(vscode_dir, "settings.json"), "w") as f:
        json.dump(settings, f, indent=4)
    
    print("✅ Created VS Code settings")

def create_pyright_config():
    """Create Pyright configuration"""
    config = {
        "include": ["backend/src"],
        "extraPaths": ["backend/src"],
        "exclude": ["backend/venv", "**/node_modules", "**/__pycache__"],
        "reportMissingImports": False,
        "reportMissingModuleSource": False,
        "pythonVersion": "3.8"
    }
    
    with open("pyrightconfig.json", "w") as f:
        json.dump(config, f, indent=4)
    
    print("✅ Created Pyright configuration")

def check_virtual_env():
    """Check if virtual environment exists"""
    venv_path = "backend/venv/bin/python3"
    if os.path.exists(venv_path):
        print("✅ Virtual environment found")
        return True
    else:
        print("❌ Virtual environment not found")
        print("   Run: cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt")
        return False

def main():
    print("🔧 Fixing IDE Configuration...")
    print("=" * 40)
    
    # Change to project root
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Check virtual environment
    venv_exists = check_virtual_env()
    
    # Create configurations
    create_vscode_settings()
    create_pyright_config()
    
    print("\n📋 Next Steps:")
    if not venv_exists:
        print("1. Set up virtual environment:")
        print("   cd backend")
        print("   python3 -m venv venv")
        print("   source venv/bin/activate") 
        print("   pip install -r requirements.txt")
    
    print("2. Restart your IDE (VS Code/PyCharm)")
    print("3. Select the Python interpreter: ./backend/venv/bin/python3")
    print("4. Reload the window if import errors persist")
    
    print("\n✅ IDE configuration complete!")

if __name__ == "__main__":
    main()