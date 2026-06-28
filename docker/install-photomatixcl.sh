#!/bin/sh
set -eu

install_dir="${PHOTOMATIXCL_INSTALL_DIR:-/opt/photomatixcl}"
download_url="${PHOTOMATIXCL_DOWNLOAD_URL:-}"
archive_path="/tmp/photomatixcl.tar.gz"

if [ -z "$download_url" ]; then
  echo "PHOTOMATIXCL_DOWNLOAD_URL is not set."
  echo "Download the Linux ARM PhotomatixCL archive from HDRsoft or set PHOTOMATIXCL_DOWNLOAD_URL explicitly."
  exit 2
fi

mkdir -p "$install_dir"
curl -fsSL "$download_url" -o "$archive_path"
tar -xzf "$archive_path" -C "$install_dir" --strip-components=1
rm -f "$archive_path"

photomatix_path="$(find "$install_dir" -type f -name PhotomatixCL -print -quit)"

if [ -z "$photomatix_path" ]; then
  echo "PhotomatixCL executable was not found after extraction."
  exit 3
fi

chmod +x "$photomatix_path"
echo "PhotomatixCL installed. Set PHOTOMATIXCL_PATH=$photomatix_path"
