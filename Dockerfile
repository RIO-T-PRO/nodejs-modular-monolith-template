# ==============================================================================
# STAGE 1: The Core Foundation
# ==============================================================================
# We use the official slim Debian image for Node 24. It keeps the image small
# while retaining the full C++ libraries (glibc) needed for native packages.
FROM node:24-bookworm-slim AS base

# Tell pnpm where to keep its global engine binaries and add it to the system path
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Corepack comes built into Node. Enabling it activates pnpm instantly.
RUN corepack enable

# This is our main working directory inside the container
WORKDIR /app

# ==============================================================================
# STAGE 2: Catching the Dependency Cache
# ==============================================================================
# We start fresh from base here to handle the initial package installation.
FROM base AS deps

# Grab just the core configuration and workspace lockfiles first
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# MONOLITH CACHE TRAP: In a modular monolith, developers change module code constantly.
# If we copied full module directories here, ANY file change would break the cache 
# and trigger a fresh pnpm install. We only copy package.jsons to map the workspace tree.
COPY src/app/package.json src/app/package.json
COPY src/shared-kernel/package.json src/shared-kernel/package.json

# As you add new business modules (billing, users, etc.), map their package.jsons here:
# COPY src/modules/user/package.json src/modules/user/package.json

# Install all dependencies (including dev tools like TypeScript) using your exact lockfile
RUN pnpm install --frozen-lockfile

# ==============================================================================
# STAGE 3: Compiling Your Monolith
# ==============================================================================
# Build on top of 'deps' so we can use your compilers and build tools
FROM deps AS build

# Now that dependencies are safely locked down, pull in the actual source code
COPY . .

# Run your compilation scripts to build your source directories into production bundles
RUN pnpm build


# ==============================================================================
# STAGE 4: Production-Only Dependencies
# ==============================================================================
# Spin up from 'base' to do a parallel installation strictly for the production run
FROM base AS prod-deps

# Bring in the workspace configurations again
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY src/app/package.json src/app/package.json
COPY src/shared-kernel/package.json src/shared-kernel/package.json
# COPY src/modules/users/package.json src/modules/users/package.json

# Exclude development dependencies to strip away heavy test runners and compilers
RUN pnpm install --frozen-lockfile --prod

# ==============================================================================
# STAGE 5: Hardened Production Runtime
# ==============================================================================
# This is the actual clean container that gets deployed to production
FROM node:24-bookworm-slim AS runtime

# Optimize popular frameworks (Express, Fastify, Nest) for raw production speed
ENV NODE_ENV=production
WORKDIR /app

# VULNERABILITY MITIGATION:
# Base images are frozen when published by the Node team. Running apt-get upgrade 
# pulls downstream Debian security updates right now to clear scanner alerts.
RUN apt-get update && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

# Never run your application process as root. We spin up a restricted 'nodeapp' user.
RUN groupadd --system nodeapp && useradd --system --gid nodeapp nodeapp

# Bring in your clean production dependencies from Stage 4
COPY --from=prod-deps /app/node_modules ./node_modules

# Bring in only your compiled/built directory folders from Stage 3
COPY --from=build /app/src ./src

# Include your main project manifest definitions
COPY package.json ./

# Switch execution permissions over to your safe, non-root user profile
USER nodeapp

# Inform container network routers that the monolith listens on port 4001
EXPOSE 4001

# TEST MODE DUMMY CMD: Replaced missing 'dist/server.js' execution script with a 
# keep-alive process so you can verify that the image successfully builds and mounts.
CMD ["node", "-e", "console.log('Monolith workspace setup verified!'); setInterval(() => {}, 1000);"]
# Execute the application core entrypoint script
# CMD ["node", "src/app/dist/server.js"]
