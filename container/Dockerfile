FROM ghcr.io/coder/code-server:4.138.0
LABEL org.opencontainers.image.title="RStudio Indent Test Editor" \
      org.opencontainers.image.authors="Colin Conwell <colinconwell@gmail.com>" \
      org.opencontainers.image.source="https://github.com/ColinConwell/VSC-R-Indent"
COPY --chown=coder:coder artifacts/rstudio-indent.vsix /opt/rstudio-indent/rstudio-indent.vsix
COPY --chown=coder:coder tests/manual_indent_tests.R tests/comprehensive_test.R /opt/rstudio-indent/examples/
COPY --chown=coder:coder container/settings.json /opt/rstudio-indent/settings.json
COPY --chown=coder:coder container/start.sh /opt/rstudio-indent/start.sh
RUN code-server --extensions-dir /home/coder/extensions --install-extension /opt/rstudio-indent/rstudio-indent.vsix --force
ENTRYPOINT ["/usr/bin/dumb-init", "--", "sh", "/opt/rstudio-indent/start.sh"]
