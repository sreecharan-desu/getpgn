import os
from PIL import Image, ImageDraw

def bezier_point(p0, p1, p2, p3, t):
    x = (1-t)**3 * p0[0] + 3*(1-t)**2 * t * p1[0] + 3*(1-t) * t**2 * p2[0] + t**3 * p3[0]
    y = (1-t)**3 * p0[1] + 3*(1-t)**2 * t * p1[1] + 3*(1-t) * t**2 * p2[1] + t**3 * p3[1]
    return (x, y)

def generate_base_image():
    # 512x512 Canvas
    size = 512
    img = Image.new("RGBA", (size, size), (10, 10, 10, 255)) # #0A0A0A background
    draw = ImageDraw.Draw(img)
    
    # Scale factor from 100 to 512
    scale = 5.12
    
    # 1. Draw Head Sphere
    cx, cy = 50 * scale, 24 * scale
    r = 11 * scale
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 255, 255, 255))
    
    # 2. Draw Neck Collar
    x0, y0 = 42 * scale, 38 * scale
    x1, y1 = 58 * scale, 41 * scale
    draw.rounded_rectangle([x0, y0, x1, y1], radius=1.5 * scale, fill=(255, 255, 255, 255))
    
    # 3. Draw Body Curve
    # Construct polygon for body
    body_points = []
    
    # Left Curve (from top to bottom)
    p0 = (43 * scale, 41 * scale)
    p1 = (37 * scale, 50 * scale)
    p2 = (32 * scale, 64 * scale)
    p3 = (28 * scale, 75 * scale)
    for i in range(101):
        t = i / 100.0
        body_points.append(bezier_point(p0, p1, p2, p3, t))
        
    # Bottom line
    body_points.append((72 * scale, 75 * scale))
    
    # Right Curve (from bottom to top)
    p0_r = (72 * scale, 75 * scale)
    p1_r = (68 * scale, 64 * scale)
    p2_r = (63 * scale, 50 * scale)
    p3_r = (57 * scale, 41 * scale)
    for i in range(101):
        t = i / 100.0
        body_points.append(bezier_point(p0_r, p1_r, p2_r, p3_r, t))
        
    # Draw body shape
    draw.polygon(body_points, fill=(255, 255, 255, 255))
    
    # 4. Draw Base Platform
    x0, y0 = 22 * scale, 77 * scale
    x1, y1 = 78 * scale, 83 * scale
    draw.rounded_rectangle([x0, y0, x1, y1], radius=2.5 * scale, fill=(255, 255, 255, 255))
    
    # 5. Draw Horizontal Slits (background color cuts)
    slits = [47, 53.5, 60, 66.5, 73]
    h = 2.5 * scale
    for s_y in slits:
        y = s_y * scale
        draw.rectangle([0, y, size, y + h], fill=(10, 10, 10, 255))
        
    return img

def main():
    print("Generating GetPGN branding icon assets...")
    img = generate_base_image()
    
    project_root = "/Users/sreecharandesu/Projects/notamate-mvp"
    
    # Define target files
    apple_icon_path = os.path.join(project_root, "public/apple-touch-icon.png")
    favicon_ico_public_path = os.path.join(project_root, "public/favicon.ico")
    favicon_ico_app_path = os.path.join(project_root, "src/app/favicon.ico")
    
    # 1. Save Apple Touch Icon (180x180 png)
    apple_img = img.resize((180, 180), Image.Resampling.LANCZOS)
    apple_img.save(apple_icon_path, "PNG")
    print(f"Saved: {apple_icon_path}")
    
    # 2. Save favicon.ico (multi-resolution)
    # Convert image to RGB for ICO compatibility or keep RGBA
    # Resize to standard sizes: 16x16, 32x32, 48x48
    sizes = [(16, 16), (32, 32), (48, 48)]
    ico_imgs = [img.resize(sz, Image.Resampling.LANCZOS) for sz in sizes]
    
    # Save to public/
    ico_imgs[0].save(favicon_ico_public_path, format="ICO", append_images=ico_imgs[1:], sizes=[(16,16), (32,32), (48,48)])
    print(f"Saved: {favicon_ico_public_path}")
    
    # Save to src/app/
    ico_imgs[0].save(favicon_ico_app_path, format="ICO", append_images=ico_imgs[1:], sizes=[(16,16), (32,32), (48,48)])
    print(f"Saved: {favicon_ico_app_path}")
    
    print("Branding icon assets generated successfully!")

if __name__ == "__main__":
    main()
