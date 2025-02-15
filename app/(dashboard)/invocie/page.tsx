import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

export default function InvoicePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice</CardTitle>
        <CardDescription>View all customers and their orders.</CardDescription>
      </CardHeader>
      <CardContent></CardContent>
    </Card>
  );
}
