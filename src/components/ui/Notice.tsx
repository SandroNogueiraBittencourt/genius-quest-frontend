export function Notice({ message }: { message: string }) {
  return (
    <div role="alert" className="ui-notice">
      <span aria-hidden="true">!</span>
      <p>{message}</p>
    </div>
  );
}
