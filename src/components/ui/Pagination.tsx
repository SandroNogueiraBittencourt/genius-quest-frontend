import { Button } from './Button';

export function Pagination({
  label,
  page,
  totalPages,
  onPageChange,
  busy,
}: {
  label: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  busy: boolean;
}) {
  if (page === 0 && totalPages <= 1) return null;
  return (
    <nav aria-label={label} className="ui-pagination">
      <Button
        variant="outline"
        disabled={busy || page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        Anterior
      </Button>
      <span role="status">
        Página {page + 1}
        {totalPages > page ? ` de ${totalPages}` : ''}
      </span>
      <Button
        variant="outline"
        disabled={busy || page + 1 >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Próxima
      </Button>
    </nav>
  );
}
