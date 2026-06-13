import CustomerProfile from "@/components/admin/CustomerProfile";

type tParams = Promise<{ phone: string }>;

export default async function CustomerProfilePage(props: { params: tParams }) {
  const { phone } = await props.params;
  return <CustomerProfile phone={decodeURIComponent(phone)} />;
}
