#!/usr/bin/env bash
# Relay CLI 1-Line Installer
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/mrgofurov/relay/main/install.sh | bash
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

# Detect if running from within a local relay repository or current working directory
LOCAL_API_DIR=""
if [ -d "./apps/api" ] && [ -f "./apps/api/pyproject.toml" ]; then
    LOCAL_API_DIR="$(pwd)/apps/api"
elif [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"
    if [ -d "${SCRIPT_DIR}/apps/api" ] && [ -f "${SCRIPT_DIR}/apps/api/pyproject.toml" ]; then
        LOCAL_API_DIR="${SCRIPT_DIR}/apps/api"
    fi
fi

echo -e "Preparing virtual environment in ${VENV_DIR}..."
"${PYTHON_BIN}" -m venv "${VENV_DIR}"
"${VENV_DIR}/bin/pip" install --upgrade pip --quiet

if [ -n "${LOCAL_API_DIR}" ]; then
    echo -e "Installing from local source: ${BLUE}${LOCAL_API_DIR}${NC}"
    "${VENV_DIR}/bin/pip" install --quiet -e "${LOCAL_API_DIR}"
else
    echo -e "Installing Relay CLI from GitHub repository (${BLUE}mrgofurov/relay${NC})..."
    "${VENV_DIR}/bin/pip" install --quiet "git+https://github.com/mrgofurov/relay.git#subdirectory=apps/api"
fi

if [ ! -f "${VENV_DIR}/bin/relay" ]; then
    echo -e "${RED}Error: Relay executable was not created in ${VENV_DIR}/bin/relay${NC}"
    exit 1
fi

# Create launcher shim in ~/.relay/bin/relay using absolute HOME path
cat <<EOF > "${BIN_DIR}/relay"
#!/usr/bin/env bash
VENV_BIN="${VENV_DIR}/bin/relay"
if [ -f "\${VENV_BIN}" ]; then
    exec "\${VENV_BIN}" "\$@"
else
    echo "Error: Relay virtualenv not found at \${VENV_BIN}" >&2
    exit 1
fi
EOF
chmod +x "${BIN_DIR}/relay"

# Also symlink into ~/.local/bin if directory exists
mkdir -p "${HOME}/.local/bin"
ln -sf "${BIN_DIR}/relay" "${HOME}/.local/bin/relay"

echo ""
echo -e "${GREEN}${BOLD}✓ Relay CLI installed successfully!${NC}"
echo ""

# Check PATH
case ":$PATH:" in
    *":${BIN_DIR}:"*|*":${HOME}/.local/bin:"*) ;;
    *)
        echo -e "${YELLOW}Notice: Ensure ~/.local/bin is in your PATH:${NC}"
        SHELL_RC="${HOME}/.bashrc"
        if [ -n "${ZSH_VERSION:-}" ] || [ "$(basename "${SHELL:-}")" = "zsh" ]; then
            SHELL_RC="${HOME}/.zshrc"
        fi
        echo -e "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ${SHELL_RC}"
        echo -e "  export PATH=\"\$HOME/.local/bin:\$PATH\""
        echo ""
        ;;
esac

echo -e "Try it now:"
echo -e "  ${BOLD}relay --help${NC}"
echo -e "  ${BOLD}relay login${NC}"
echo -e "  ${BOLD}relay agent connect <CODE>${NC}"
echo ""
