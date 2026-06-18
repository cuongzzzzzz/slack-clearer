import os
import zlib
import struct

def create_png(width, height, draw_func):
    """Creates a PNG bytearray using zlib and struct (pure python, no external libraries)."""
    # PNG signature
    png_data = bytearray(b'\x89PNG\r\n\x1a\n')

    # IHDR chunk
    # Width: 4 bytes, Height: 4 bytes, Bit depth: 1 (8 bits), Color type: 6 (RGBA),
    # Compression: 0, Filter: 0, Interlace: 0
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png_data += write_chunk(b'IHDR', ihdr_data)

    # Pixel data (RGBA)
    raw_pixels = bytearray()
    for y in range(height):
        raw_pixels.append(0) # Filter byte for each scanline (0 = None)
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw_pixels.extend([r, g, b, a])

    # IDAT chunk
    idat_data = zlib.compress(raw_pixels)
    png_data += write_chunk(b'IDAT', idat_data)

    # IEND chunk
    png_data += write_chunk(b'IEND', b'')

    return png_data

def write_chunk(chunk_type, data):
    length = len(data)
    chunk = struct.pack('>I', length) + chunk_type + data
    crc = zlib.crc32(chunk_type + data) & 0xffffffff
    chunk += struct.pack('>I', crc)
    return chunk

def draw_slack_cleaner_icon(x, y, w, h):
    """Draws a beautiful Slack-style icon with a trash/eraser touch."""
    # Normalize coordinates to -1 to 1
    nx = (x / (w - 1)) * 2 - 1
    ny = (y / (h - 1)) * 2 - 1
    dist_sq = nx*nx + ny*ny

    # Soft dark rounded background
    bg_radius = 0.95
    if dist_sq > bg_radius * bg_radius:
        return 0, 0, 0, 0 # Transparent corners

    if dist_sq > 0.85 * 0.85:
        # border ring (violet/purple)
        return 139, 92, 246, 255 # Violet border

    # Inner background
    if dist_sq > 0.80 * 0.80:
        return 15, 23, 42, 255 # Slate-900 border gap

    # Dark background slate
    r_bg, g_bg, b_bg = 15, 23, 42

    # Draw Slack-colored pods/sprays
    # Slack colors:
    # Pink/Red: #E01E5A (224, 30, 90)
    # Blue: #36C5F0 (54, 197, 240)
    # Green: #2EB67D (46, 182, 125)
    # Yellow: #ECB22E (236, 178, 46)

    # Center circle size
    center_dist = nx*nx + ny*ny
    if center_dist < 0.2:
        # White center star/dust representing cleaning
        if abs(nx) < 0.15 and abs(ny) < 0.15:
            return 255, 255, 255, 255

    # Top-Left: Pink
    if nx < -0.1 and ny < -0.1:
        return 224, 30, 90, 255
    # Top-Right: Blue
    if nx > 0.1 and ny < -0.1:
        return 54, 197, 240, 255
    # Bottom-Right: Green
    if nx > 0.1 and ny > 0.1:
        return 46, 182, 125, 255
    # Bottom-Left: Yellow
    if nx < -0.1 and ny > 0.1:
        return 236, 178, 46, 255

    # Fallback to dark background
    return r_bg, g_bg, b_bg, 255

def main():
    icons_dir = "/Users/kangz/Desktop/Wgentech/APG/slack-message-deleter/icons"
    os.makedirs(icons_dir, exist_ok=True)

    sizes = [16, 48, 128]
    for size in sizes:
        filename = f"icon{size}.png"
        filepath = os.path.join(icons_dir, filename)
        print(f"Generating {filepath}...")
        png_data = create_png(size, size, draw_slack_cleaner_icon)
        with open(filepath, "wb") as f:
            f.write(png_data)
    
    print("All icons generated successfully!")

if __name__ == "__main__":
    main()
