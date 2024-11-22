# Auto Tagging GitHub Action

## Overview

This GitHub Action automates semantic versioning and integrates it into CI/CD workflows. It supports tagging commits, creating releases, and building Docker images with metadata.

---

## Examples

### Example 1: Auto Tagging with Release Creation

This workflow creates a new semantic tag (`vX.Y.Z`) for every push to the repository, then generates a GitHub release for the new tag.

```yaml
on: [push]

jobs:
  tag:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    name: Tag pushed commit
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate Tag
        id: tag
        uses: mazaheriMahdi/auto-tagger-action@v0.0.10
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Latest Tag
        run: echo "The Latest version ${{ steps.tag.outputs.tag }}"

    outputs:
      tag: ${{ steps.tag.outputs.tag }}

  create-release:
    permissions:
      contents: write
    needs: tag
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Latest Tag
        run: echo "The latest version is ${{ needs.tag.outputs.tag }}"

      - name: Create a Release
        id: create_release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ needs.tag.outputs.tag }} # Use the tag output from the previous job
          release_name: Release ${{ needs.tag.outputs.tag }}
          body: |
            Automatically generated release for tag ${{ needs.tag.outputs.tag }}.
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

### Example 2: Auto Tagging with Docker Build and Release

This workflow extends the auto-tagging process by building and pushing Docker images with semantic tags. It also includes Docker build metadata in the release notes.

```yaml
on:
  push:
    branches:
      - master

jobs:
  tag:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    name: Tag pushed commit
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate Tag
        id: tag
        uses: mazaheriMahdi/auto-tagger-action@v0.0.10
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Latest Tag
        run: echo "The Latest version ${{ steps.tag.outputs.tag }}"

    outputs:
      tag: ${{ steps.tag.outputs.tag }}

  docker:
    name: Build Docker Image
    needs: tag
    runs-on: ubuntu-latest
    steps:
      - name: Docker Meta
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: |
            ${{ vars.DOCKERHUB_USERNAME }}/cms_client
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=semver,pattern={{major}}
            type=sha

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          username: ${{ vars.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Login to GHCR
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Build and Push
        uses: docker/build-push-action@v6
        with:
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

    outputs:
      image_tags: ${{ steps.meta.outputs.tags }}
      labels: ${{ steps.meta.outputs.labels }}

  create-release:
    permissions:
      contents: write
    needs: [tag, docker]
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v3

      - name: Latest Tag
        run: echo "The latest version is ${{ needs.tag.outputs.tag }}"

      - name: Build Info
        run: |
          echo "Docker Image Tags: ${{ needs.docker.outputs.image_tags }}"
          echo "Docker Labels: ${{ needs.docker.outputs.labels }}"

      - name: Create a Release
        id: create_release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ needs.tag.outputs.tag }}
          release_name: Release ${{ needs.tag.outputs.tag }}
          body: |
            ## Release Notes
            - Tag: ${{ needs.tag.outputs.tag }}
            - Docker Image Tags:
              ${{ needs.docker.outputs.image_tags }}
            - Docker Labels:
              ${{ needs.docker.outputs.labels }}
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Explanation of Examples

1. **Example 1**:
   - Automatically tags commits with a semantic version.
   - Creates a GitHub release for the new tag.

2. **Example 2**:
   - Adds Docker image build and push to the workflow.
   - Includes Docker build metadata (e.g., image tags and labels) in the release notes.

---

## Key Features

- **Automated Tagging**: Ensures every push to the repository is tagged with an incremented semantic version.
- **Integrated Docker Builds**: Builds and pushes Docker images with semantic tags.
- **Detailed Release Notes**: Includes build metadata (e.g., Docker tags and labels) in GitHub release notes.
- **Extensible**: Easily customizable for additional workflows like deployment or notifications.