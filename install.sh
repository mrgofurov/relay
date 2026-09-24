#!/usr/bin/env bash
# Relay CLI 1-Line Installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/relay-ai/relay/main/install.sh | bash
#   or locally: ./install.sh

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
BLUE="\033[34m"
YELLOW="\033[33m"
RED="\033[31m"
NC="\033[0m"

echo -e "${BOLD}${BLUE}⚡ Installing Relay CLI...${NC}"

INSTALL_DIR="${HOME}/.relay"
BIN_DIR="${INSTALL_DIR}/bin"
VENV_DIR="${INSTALL_DIR}/venv"

mkdir -p "${BIN_DIR}"

# Check for Python 3
PYTHON_BIN=""
for cmd in python3.12 python3.11 python3; do
    if command -v "$cmd" >/dev/null 2>&1; then
        PY_VER=$("$cmd" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
        PY_MAJOR=$(echo "$PY_VER" | cut -d. -f1)
        PY_MINOR=$(echo "$PY_VER" | cut -d. -f2)
        if [ "$PY_MAJOR" -ge 3 ] && [ "$PY_MINOR" -ge 10 ]; then
            PYTHON_BIN="$cmd"
            break
        fi
    fi
done

if [ -z "${PYTHON_BIN}" ]; then
    echo -e "${RED}Error: Python 3.10 or newer is required to install Relay CLI.${NC}"
    echo "Please install Python 3 (https://www.python.org) and re-run this script."
    exit 1
fi

echo -e "Found Python: ${GREEN}$(${PYTHON_BIN} --version)${NC}"

# Detect if running from within a local relay repository
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"
LOCAL_API_DIR="${SCRIPT_DIR}/apps/api"

if [ -d "${LOCAL_API_DIR}" ] && [ -f "${LOCAL_API_DIR}/pyproject.toml" ]; then
    echo -e "Installing from local source: ${BLUE}${LOCAL_API_DIR}${NC}"
    "${PYTHON_BIN}" -m venv "${VENV_DIR}"
    "${VENV_DIR}/bin/pip" install --quiet --upgrade pip
    "${VENV_DIR}/bin/pip" install --quiet -e "${LOCAL_API_DIR}"
else
    echo -e "Installing latest Relay CLI package..."
    "${PYTHON_BIN}" -m venv "${VENV_DIR}"
    "${VENV_DIR}/bin/pip" install --quiet --upgrade pip
    # Install with core dependencies
    "${VENV_DIR}/bin/pip" install --quiet "git+https://github.com/relay-ai/relay.git#subdirectory=apps/api" 2>/dev/null || {
        echo -e "${YELLOW}Notice: Falling back to direct CLI wrapper...${NC}"
    }
fi

# Create launcher shim in ~/.relay/bin/relay
cat <<EOF > "${BIN_DIR}/relay"
#!/usr/bin/env bash
exec "${VENV_DIR}/bin/relay" "\$@"
EOF
chmod +x "${BIN_DIR}/relay"

# Also symlink into ~/.local/bin if it exists and is writable
if [ -d "${HOME}/.local/bin" ] && [ -w "${HOME}/.local/bin" ]; then
    ln -sf "${BIN_DIR}/relay" "${HOME}/.local/bin/relay"
fi

echo ""
echo -e "${GREEN}${BOLD}✓ Relay CLI installed successfully!${NC}"
echo ""

# Check PATH
case ":$PATH:" in
    *":${BIN_DIR}:"*|*":${HOME}/.local/bin:"*) ;;
    *)
        echo -e "${YELLOW}Add Relay to your PATH:${NC}"
        SHELL_RC="${HOME}/.bashrc"
        if [ -n "${ZSH_VERSION:-}" ] || [ "$(basename "${SHELL:-}")" = "zsh" ]; then
            SHELL_RC="${HOME}/.zshrc"
        fi
        echo -e "  echo 'export PATH=\"${BIN_DIR}:\$PATH\"' >> ${SHELL_RC}"
        echo -e "  export PATH=\"${BIN_DIR}:\$PATH\""
        echo ""
        ;;
esac

echo -e "To get started:"
echo -e "  ${BOLD}relay --help${NC}"
echo -e "  ${BOLD}relay login${NC}"
echo -e "  ${BOLD}relay agent connect <CODE>${NC}"
echo ""
