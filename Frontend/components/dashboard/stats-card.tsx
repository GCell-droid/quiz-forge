import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function StatsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mira - Geist</CardTitle>
        <CardDescription>
          Designers love quirky glyphs.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid grid-cols-6 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-10 w-10 rounded-md bg-muted" />
        ))}
      </CardContent>
    </Card>
  );
}
