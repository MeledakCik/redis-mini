import { RedisConsole } from "@/components/redis-console";

export default function RedisDetailPage({ params }) {
  return <RedisConsole id={params.id} />;
}
