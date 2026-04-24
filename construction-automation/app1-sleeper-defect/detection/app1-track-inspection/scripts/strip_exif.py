"""
strip_exif.py — Ground2Tech App 1
Strips ALL EXIF metadata (including GPS coordinates) from photos
before uploading to Roboflow or any external platform.

Usage:
    python strip_exif.py --input /path/to/photos --output /path/to/clean

Requirements:
    pip install piexif Pillow
"""

import os
import argparse
import shutil
from pathlib import Path

try:
    import piexif
    from PIL import Image
except ImportError:
    print("Missing dependencies. Run: pip install piexif Pillow")
    exit(1)


def strip_exif(input_path: Path, output_path: Path) -> dict:
    """
    Strip EXIF from all JPEG/JPG images in input_path.
    Saves clean copies to output_path.
    Returns a summary report.
    """
    output_path.mkdir(parents=True, exist_ok=True)

    extensions = {'.jpg', '.jpeg', '.JPG', '.JPEG'}
    images = [f for f in input_path.iterdir() if f.suffix in extensions]

    if not images:
        print(f"No JPEG images found in {input_path}")
        return {}

    report = {
        'total': len(images),
        'stripped': 0,
        'no_exif': 0,
        'errors': [],
        'gps_found': [],
    }

    print(f"\nFound {len(images)} images in {input_path}")
    print(f"Output: {output_path}\n")

    for img_path in sorted(images):
        out_path = output_path / img_path.name
        try:
            # Check for GPS before stripping (for the report)
            try:
                exif_dict = piexif.load(str(img_path))
                has_gps = bool(exif_dict.get('GPS'))
                if has_gps:
                    report['gps_found'].append(img_path.name)
            except Exception:
                has_gps = False

            # Open and re-save without EXIF
            img = Image.open(img_path)

            # Convert to RGB if needed (handles RGBA, palette mode, etc.)
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')

            # Save without any EXIF data
            img.save(out_path, 'JPEG', quality=95, exif=b'')

            report['stripped'] += 1
            status = "GPS stripped ⚠️ " if has_gps else "OK"
            print(f"  {img_path.name} → {status}")

        except piexif.InvalidImageDataError:
            # No EXIF at all — just copy the file
            shutil.copy2(img_path, out_path)
            report['no_exif'] += 1
            print(f"  {img_path.name} → no EXIF (copied)")

        except Exception as e:
            report['errors'].append((img_path.name, str(e)))
            print(f"  {img_path.name} → ERROR: {e}")

    # Summary
    print(f"\n{'='*50}")
    print(f"SUMMARY")
    print(f"{'='*50}")
    print(f"Total images:     {report['total']}")
    print(f"EXIF stripped:    {report['stripped']}")
    print(f"No EXIF (copied): {report['no_exif']}")
    print(f"Errors:           {len(report['errors'])}")
    print(f"GPS found in:     {len(report['gps_found'])} files")

    if report['gps_found']:
        print(f"\n⚠️  GPS coordinates were present and removed from:")
        for f in report['gps_found']:
            print(f"     {f}")

    if report['errors']:
        print(f"\n❌ Errors:")
        for fname, err in report['errors']:
            print(f"     {fname}: {err}")

    print(f"\n✅ Clean images saved to: {output_path}")
    return report


def verify_no_gps(output_path: Path):
    """
    Verification pass — confirms no GPS remains in output files.
    Run this after stripping to be sure.
    """
    extensions = {'.jpg', '.jpeg', '.JPG', '.JPEG'}
    images = [f for f in output_path.iterdir() if f.suffix in extensions]
    gps_remaining = []

    for img_path in images:
        try:
            exif_dict = piexif.load(str(img_path))
            if exif_dict.get('GPS') and exif_dict['GPS']:
                gps_remaining.append(img_path.name)
        except Exception:
            pass  # No EXIF = no GPS, fine

    if gps_remaining:
        print(f"\n❌ VERIFICATION FAILED — GPS still present in:")
        for f in gps_remaining:
            print(f"   {f}")
    else:
        print(f"\n✅ VERIFICATION PASSED — No GPS coordinates in any output file.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Strip EXIF metadata from JPEG photos before Roboflow upload'
    )
    parser.add_argument(
        '--input', '-i',
        required=True,
        help='Folder containing original photos'
    )
    parser.add_argument(
        '--output', '-o',
        required=True,
        help='Folder for clean photos (created if it does not exist)'
    )
    parser.add_argument(
        '--verify',
        action='store_true',
        help='Run verification pass after stripping'
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"❌ Input folder not found: {input_path}")
        exit(1)

    report = strip_exif(input_path, output_path)

    if args.verify and report:
        verify_no_gps(output_path)