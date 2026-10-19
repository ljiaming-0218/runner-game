import { createFileRoute } from "@tanstack/react-router";
import { RunnerGame } from "@/components/runner-game";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <RunnerGame />;
}
