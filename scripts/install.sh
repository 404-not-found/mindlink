#!/bin/sh
# Brainlink installer
# Usage: curl -sL https://get.brainlink.dev | sh

set -e

VERSION="1.0.0"
REPO="404-not-found/brainlink"
INSTALL_DIR="${INSTALL_DIR:-/usr/local/bin}"

# Prefer npm if available
if command -v npm >/dev/null 2>&1; then
  echo "Installing brainlink via npm..."
  npm install -g brainlink
  echo ""
  echo "brainlink installed. Run: brainlink --help"
  exit 0
fi

# Detect OS and architecture for standalone binary
OS=$(uname -s)
ARCH=$(uname -m)

case "$OS" in
  Darwin)
    case "$ARCH" in
      arm64)   BINARY="brainlink-macos-arm64" ;;
      x86_64)  BINARY="brainlink-macos-x64" ;;
      *)        echo "Unsupported architecture: $ARCH" && exit 1 ;;
    esac
    ;;
  Linux)
    case "$ARCH" in
      x86_64)  BINARY="brainlink-linux-x64" ;;
      *)        echo "Unsupported architecture: $ARCH" && exit 1 ;;
    esac
    ;;
  *)
    echo "Unsupported OS: $OS"
    echo ""
    echo "Install Node.js then run: npm install -g brainlink"
    echo "Or download a binary from: https://github.com/$REPO/releases"
    exit 1
    ;;
esac

URL="https://github.com/${REPO}/releases/download/v${VERSION}/${BINARY}"

echo "Downloading brainlink v${VERSION}..."
curl -fsSL "$URL" -o /tmp/brainlink-install
chmod +x /tmp/brainlink-install

if [ -w "$INSTALL_DIR" ]; then
  mv /tmp/brainlink-install "${INSTALL_DIR}/brainlink"
else
  echo "Installing to $INSTALL_DIR (requires sudo)..."
  sudo mv /tmp/brainlink-install "${INSTALL_DIR}/brainlink"
fi

echo ""
echo "brainlink v${VERSION} installed to ${INSTALL_DIR}/brainlink"
echo "Run: brainlink --help"
