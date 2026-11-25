import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '../../components/ui';
import { buildRoomInvite } from './roomInvite';

export function RoomInvite({ code }: { code: string }) {
  const url = buildRoomInvite(code);
  const [feedback, setFeedback] = useState('');

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback('Link de convite copiado.');
    } catch {
      setFeedback(
        'Não foi possível copiar. Selecione o link e copie manualmente.',
      );
    }
  }

  return (
    <section className="real-room-invite" aria-label="Convite para a sala">
      <div className="real-room-invite-qr">
        <QRCodeSVG
          value={url}
          size={200}
          level="M"
          marginSize={4}
          title="QR Code do convite para a sala"
        />
      </div>
      <div className="real-room-invite-content">
        <h3>Convide seus amigos</h3>
        <p>Escaneie o QR Code com a câmera do celular ou compartilhe o link.</p>
        <label htmlFor="real-room-invite-link">Link de convite</label>
        <input
          id="real-room-invite-link"
          value={url}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
        />
        <Button variant="outline" onClick={() => void copy()}>
          Copiar link
        </Button>
        <p role="status">{feedback}</p>
      </div>
    </section>
  );
}
