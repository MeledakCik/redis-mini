import Docker from "dockerode";

let docker;
function getDocker() {
  if (!docker) docker = new Docker();
  return docker;
}

const LABEL_KEY = "app";
const LABEL_VALUE = "mini-upstash";
const REDIS_IMAGE = "redis:7-alpine";

export async function isDockerRunning() {
  try {
    await getDocker().ping();
    return true;
  } catch {
    return false;
  }
}

export async function createRedisContainer({ id, port, password, containerName }) {
  const d = getDocker();

  // pastikan image ada, kalau belum -> pull dulu
  try {
    await d.getImage(REDIS_IMAGE).inspect();
  } catch {
    await new Promise((resolve, reject) => {
      d.pull(REDIS_IMAGE, (err, stream) => {
        if (err) return reject(err);
        d.modem.followProgress(stream, (err2) => (err2 ? reject(err2) : resolve()));
      });
    });
  }

  const container = await d.createContainer({
    name: containerName,
    Image: REDIS_IMAGE,
    Labels: {
      [LABEL_KEY]: LABEL_VALUE,
      "mini-upstash.id": id,
    },
    Cmd: [
      "redis-server",
      "--requirepass", password,
      "--maxmemory", "100mb",
      "--maxmemory-policy", "allkeys-lru",
    ],
    ExposedPorts: { "6379/tcp": {} },
    HostConfig: {
      PortBindings: { "6379/tcp": [{ HostIp: "127.0.0.1", HostPort: String(port) }] },
      RestartPolicy: { Name: "always" },
    },
  });

  await container.start();
  return container.id;
}

export async function listLiveContainers() {
  const d = getDocker();
  return d.listContainers({ all: true, filters: JSON.stringify({ label: [`${LABEL_KEY}=${LABEL_VALUE}`] }) });
}

export async function getContainerLiveInfo(containerId) {
  const live = await listLiveContainers();
  return live.find((c) => c.Id === containerId) || null;
}

export async function containerStats(containerId) {
  const d = getDocker();
  const container = d.getContainer(containerId);
  const stats = await container.stats({ stream: false });
  return stats;
}

export async function restartContainer(containerId) {
  const d = getDocker();
  await d.getContainer(containerId).restart();
}

export async function removeContainer(containerId) {
  const d = getDocker();
  const container = d.getContainer(containerId);
  try {
    await container.stop();
  } catch {}
  try {
    await container.remove({ force: true });
  } catch {}
}

const QDRANT_IMAGE = "qdrant/qdrant:latest";
const QDRANT_CONTAINER_NAME = "mini-upstash-qdrant";
const QDRANT_PORT = 6333;
const QDRANT_GRPC_PORT = 6334;

// Semua Vector DB berbagi SATU container Qdrant (tiap vector DB = 1 collection di dalamnya) —
// ini mengikuti arsitektur asli Qdrant, bukan 1 container per database seperti Redis.
export async function ensureQdrantRunning() {
  const d = getDocker();
  try {
    const existing = d.getContainer(QDRANT_CONTAINER_NAME);
    const info = await existing.inspect();
    if (!info.State.Running) await existing.start();
    return { containerId: info.Id, alreadyExisted: true };
  } catch (err) {
    // container belum ada -> buat baru
  }

  try {
    await d.getImage(QDRANT_IMAGE).inspect();
  } catch {
    await new Promise((resolve, reject) => {
      d.pull(QDRANT_IMAGE, (err, stream) => {
        if (err) return reject(err);
        d.modem.followProgress(stream, (err2) => (err2 ? reject(err2) : resolve()));
      });
    });
  }

  const container = await d.createContainer({
    name: QDRANT_CONTAINER_NAME,
    Image: QDRANT_IMAGE,
    Labels: { [LABEL_KEY]: "mini-upstash-vector" },
    ExposedPorts: { "6333/tcp": {}, "6334/tcp": {} },
    HostConfig: {
      PortBindings: {
        "6333/tcp": [{ HostIp: "127.0.0.1", HostPort: String(QDRANT_PORT) }],
        "6334/tcp": [{ HostIp: "127.0.0.1", HostPort: String(QDRANT_GRPC_PORT) }],
      },
      Binds: ["qdrant_storage:/qdrant/storage"],
      RestartPolicy: { Name: "always" },
    },
  });
  await container.start();
  return { containerId: container.id, alreadyExisted: false };
}

export async function getQdrantStatus() {
  const d = getDocker();
  try {
    const container = d.getContainer(QDRANT_CONTAINER_NAME);
    const info = await container.inspect();
    return { running: info.State.Running, containerId: info.Id };
  } catch {
    return { running: false, containerId: null };
  }
}

export async function restartQdrantContainer() {
  const d = getDocker();
  await d.getContainer(QDRANT_CONTAINER_NAME).restart();
}

export { QDRANT_PORT };

