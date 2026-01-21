import sys
import os
from PIL import Image

def convert_to_jpg(input_path, output_path, size=(100, 100)):
    try:
        img = Image.open(input_path)
        # Convert to RGB (JPG doesn't support transparency)
        if img.mode != 'RGB':
            # Create a white background for transparent areas
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[3])
            else:
                background.paste(img)
            img = background
        
        # Resize to 100x100
        img = img.resize(size, Image.Resampling.LANCZOS)
        # Save as JPG
        img.save(output_path, format='JPEG', quality=95)
        print(f"Successfully converted {input_path} to {output_path}")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python convert_jpg.py <input_png> <output_jpg>")
        sys.exit(1)
    
    input_png = sys.argv[1]
    output_jpg = sys.argv[2]
    convert_to_jpg(input_png, output_jpg)
