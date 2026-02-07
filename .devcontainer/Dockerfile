FROM node:18-bullseye

# Create app directory
WORKDIR /workspace

# Avoid installing dev packages globally here; use npm in workspace
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git && rm -rf /var/lib/apt/lists/*

CMD ["/bin/bash"]
