import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function EnvCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment Variables</CardTitle>
        <CardDescription>Production</CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        <Input value="DATABASE_URL" readOnly />
        <Input value="NEXT_PUBLIC_API" readOnly />
        <Input value="STRIPE_SECRET" readOnly />

        <div className="flex justify-between mt-2">
          <Button variant="outline">Edit</Button>
          <Button>Deploy</Button>
        </div>
      </CardContent>
    </Card>
  );
}
