const RULE_ID = "K8S-007";

const checkImageTag = (deployment) => {
  const findings = [];

  const containers =
    deployment?.spec?.template?.spec?.containers || [];

  for (const container of containers) {
    const image = container?.image;

    if (!image || typeof image !== "string") {
      continue;
    }

    const trimmedImage = image.trim();

    /*
     * Digest-pinned images are immutable.
     *
     * Example:
     * nginx@sha256:abc123...
     *
     * Do not report these as mutable.
     */
    if (trimmedImage.includes("@")) {
      continue;
    }

    /*
     * Find the last "/" in the image reference.
     *
     * This allows us to distinguish a registry port from
     * an image tag.
     *
     * Example:
     * registry.example.com:5000/myapp
     *
     * The ":5000" part is a registry port, not a tag.
     */
    const lastSlashIndex = trimmedImage.lastIndexOf("/");
    const lastColonIndex = trimmedImage.lastIndexOf(":");

    let tag;

    if (lastColonIndex > lastSlashIndex) {
      /*
       * A colon after the final "/" represents an image tag.
       *
       * Example:
       * nginx:latest       -> latest
       * nginx:1.25         -> 1.25
       * registry:5000/app:latest -> latest
       */
      tag = trimmedImage.substring(lastColonIndex + 1);
    } else {
      /*
       * Kubernetes treats an image without an explicit tag
       * as "latest".
       *
       * Example:
       * nginx -> latest
       * nginx:latest -> latest
       */
      tag = "latest";
    }

    if (tag.toLowerCase() === "latest") {
      findings.push({
        rule_id: RULE_ID,
        title: "Mutable image tag",
        severity: "HIGH",
        evidence: `Container "${container.name}" uses mutable image tag: ${tag}`,
        risk: 7
      });
    }
  }

  return findings;
};

module.exports = {
  RULE_ID,
  checkImageTag
};