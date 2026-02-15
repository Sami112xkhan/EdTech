import subprocess
import webbrowser
import time
import os
import sys

def run_command(command, cwd=None):
    """Runs a command and exits if it fails."""
    try:
        subprocess.check_call(command, shell=True, cwd=cwd)
    except subprocess.CalledProcessError:
        print(f"Error executing: {command}")
        sys.exit(1)

def main():
    project_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("\n🚀 Starting Premium Course Platform...")
    print(f"📂 Project Directory: {project_dir}")

    # 1. Install Dependencies
    print("\n📦 Installing dependencies (npm install)...")
    run_command("npm install", cwd=project_dir)

    # 2. Start Dev Server & Open Browser
    print("\n🌐 Starting Development Server...")
    
    # Start npm run dev in a non-blocking subprocess
    process = subprocess.Popen("npm run dev", shell=True, cwd=project_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    print("⏳ Waiting for server to spin up...")
    time.sleep(3)  # Give Vite a moment to start

    url = "http://localhost:5173"
    print(f"\n✅ Server running! Opening {url}...")
    webbrowser.open(url)

    # Stream output so the user can see what's happening
    try:
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                print(output.strip())
    except KeyboardInterrupt:
        print("\n🛑 Stopping server...")
        process.terminate()

if __name__ == "__main__":
    main()
