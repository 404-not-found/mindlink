#!/bin/sh
# MindLink installer
# Usage: curl -sL https://get.mindlink.dev | sh

set -e

VERSION="1.0.3"
REPO="404-not-found/mindlink"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

# Prefer npm if available
if command -v npm >/dev/null 2>&1; then
  echo "Installing mindlink via npm..."
  npm install -g mindlink
  echo ""
  echo "mindlink installed. Run: mindlink --help"
  exit 0
fi

# Detect OS and architecture for standalone binary
OS=$(uname -s)
ARCH=$(uname -m)

case "$OS" in
  Darwin)
    case "$ARCH" in
      arm64)   BINARY="mindlink-macos-arm64" ;;
      x86_64)  BINARY="mindlink-macos-x64" ;;
      *)        echo "Unsupported architecture: $ARCH" && exit 1 ;;
    esac
    ;;
  Linux)
    case "$ARCH" in
      x86_64)  BINARY="mindlink-linux-x64" ;;
      *)        echo "Unsupported architecture: $ARCH" && exit 1 ;;
    esac
    ;;
  *)
    echo "Unsupported OS: $OS"
    echo ""
    echo "Install Node.js then run: npm install -g mindlink"
    echo "Or download a binary from: https://github.com/$REPO/releases"
    exit 1
    ;;
esac

URL="https://github.com/${REPO}/releases/download/v${VERSION}/${BINARY}"

echo "Downloading mindlink v${VERSION}..."
curl -fsSL "$URL" -o /tmp/mindlink-install
chmod +x /tmp/mindlink-install

if [ -w "$INSTALL_DIR" ]; then
  mv /tmp/mindlink-install "${INSTALL_DIR}/mindlink"
else
  echo "Installing to $INSTALL_DIR (requires sudo)..."
  sudo mv /tmp/mindlink-install "${INSTALL_DIR}/mindlink"
fi

echo ""
echo "mindlink v${VERSION} installed to ${INSTALL_DIR}/mindlink"
echo "Run: mindlink --help"
