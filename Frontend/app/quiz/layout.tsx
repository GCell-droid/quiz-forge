export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div>NavBar</div>
      {children}
      <div>Footer</div>
    </>
  );
}
