import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_gradient(size, color1, color2):
    base = Image.new('RGBA', size)
    draw = ImageDraw.Draw(base)
    width, height = size
    r1, g1, b1 = color1
    r2, g2, b2 = color2
    
    for y in range(height):
        ratio = y / height
        r = int(r1 * (1 - ratio) + r2 * ratio)
        g = int(g1 * (1 - ratio) + g2 * ratio)
        b = int(b1 * (1 - ratio) + b2 * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
    return base

def generate_icon(size_px, output_path):
    # Create high-res base (4x scale for super crisp anti-aliasing)
    scale = 4
    s = size_px * scale
    
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    
    # Rounded square base
    radius = int(s * 0.22)
    padding = int(s * 0.04)
    
    # Deep Sapphire Blue to Electric Cyan gradient
    grad = create_gradient((s, s), (25, 45, 110), (14, 165, 233))
    
    # Mask for rounded rectangle
    mask = Image.new('L', (s, s), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([padding, padding, s - padding, s - padding], radius=radius, fill=255)
    
    # Apply mask
    icon_base = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    icon_base.paste(grad, (0, 0), mask)
    
    # Draw top highlight border for crystal glass effect
    draw = ImageDraw.Draw(icon_base)
    draw.rounded_rectangle([padding, padding, s - padding, s - padding], radius=radius, outline=(255, 255, 255, 100), width=max(1, int(scale * 1.5)))
    
    # Draw geometric academic graduation cap (mortarboard) & lightning engine inside
    center_x, center_y = s / 2, s / 2
    
    # Mortarboard diamond top
    cap_w = s * 0.62
    cap_h = s * 0.26
    top_y = center_y - s * 0.12
    
    diamond = [
        (center_x, top_y - cap_h / 2),
        (center_x + cap_w / 2, top_y),
        (center_x, top_y + cap_h / 2),
        (center_x - cap_w / 2, top_y)
    ]
    draw.polygon(diamond, fill=(255, 255, 255, 245), outline=(220, 240, 255, 255))
    
    # Cap bottom skull part
    skull_w = s * 0.36
    skull_top_y = top_y + cap_h * 0.2
    skull_bot_y = skull_top_y + s * 0.18
    draw.polygon([
        (center_x - skull_w / 2, skull_top_y),
        (center_x + skull_w / 2, skull_top_y),
        (center_x + skull_w / 2, skull_bot_y),
        (center_x, skull_bot_y + s * 0.06),
        (center_x - skull_w / 2, skull_bot_y)
    ], fill=(230, 245, 255, 220))
    
    # Tassel hanging down with glowing circle
    draw.ellipse([center_x - s * 0.04, top_y - s * 0.04, center_x + s * 0.04, top_y + s * 0.04], fill=(56, 189, 248, 255), outline=(255, 255, 255, 255))
    
    # Glowing lightning speed badge at bottom right
    badge_r = s * 0.18
    bx = center_x + s * 0.22
    by = center_y + s * 0.22
    draw.ellipse([bx - badge_r, by - badge_r, bx + badge_r, by + badge_r], fill=(16, 185, 129, 255), outline=(255, 255, 255, 255), width=max(1, int(scale * 1.2)))
    
    # Lightning bolt inside badge
    bolt = [
        (bx + badge_r * 0.1, by - badge_r * 0.6),
        (bx - badge_r * 0.45, by + badge_r * 0.05),
        (bx - badge_r * 0.05, by + badge_r * 0.05),
        (bx - badge_r * 0.1, by + badge_r * 0.6),
        (bx + badge_r * 0.45, by - badge_r * 0.05),
        (bx + badge_r * 0.05, by - badge_r * 0.05)
    ]
    draw.polygon(bolt, fill=(255, 255, 255, 255))
    
    # Resize down with Lanczos for crystal clear quality
    final_icon = icon_base.resize((size_px, size_px), Image.Resampling.LANCZOS)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final_icon.save(output_path, 'PNG')
    print(f"Generated {output_path} ({size_px}x{size_px})")

if __name__ == '__main__':
    icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
    sizes = [16, 32, 48, 128]
    for sz in sizes:
        generate_icon(sz, os.path.join(icons_dir, f'icon{sz}.png'))
