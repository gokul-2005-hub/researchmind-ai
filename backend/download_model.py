import os
import sys
from sentence_transformers import SentenceTransformer

def download():
    # Define local directory inside backend folder
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(current_dir, "app", "local_models", "all-MiniLM-L6-v2")
    os.makedirs(model_dir, exist_ok=True)

    print(f"Pre-downloading SentenceTransformer model to local folder: {model_dir}...", flush=True)
    try:
        model = SentenceTransformer("all-MiniLM-L6-v2")
        model.save(model_dir)
        print("Model downloaded and saved successfully for offline deployment!", flush=True)
    except Exception as e:
        print(f"Error downloading model: {str(e)}", file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == "__main__":
    download()
