export function Notice({ message }: { message: string }) {
  return (
    <div role="alert" className="ui-notice">
      <p>{message}</p>
    </div>
  );
}
