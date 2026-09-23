#!/bin/sh
set -eu
mkdir -p /home/coder/workspace/.vscode /home/coder/user-data/User
# Each container gets its own editable examples. Never mount the developer's project or Docker socket.
cp -n /opt/rstudio-indent/examples/*.R /home/coder/workspace/
cp /opt/rstudio-indent/settings.json /home/coder/user-data/User/settings.json
exec code-server --bind-addr 0.0.0.0:8080 --auth none --disable-telemetry --disable-update-check \
  --extensions-dir /home/coder/extensions --user-data-dir /home/coder/user-data \
  /home/coder/workspace
