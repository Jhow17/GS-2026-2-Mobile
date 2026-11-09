/**
 * Persistência das fotos tiradas pela câmera.
 * A câmera salva no cache (que o sistema pode limpar); copiamos para o
 * diretório de documentos do app com a API nova do expo-file-system (SDK 55).
 * Se a cópia falhar, mantemos o endereço original para não perder o envio.
 */
import { Directory, File, Paths } from 'expo-file-system';

import { generateId } from '../utils/generateId';

const PHOTOS_FOLDER = 'citizentech-photos';

/** Copia a foto para documentos e devolve o novo photoUri. */
export async function persistPhoto(sourceUri: string): Promise<string> {
  try {
    const folder = new Directory(Paths.document, PHOTOS_FOLDER);
    if (!folder.exists) {
      folder.create({ intermediates: true, idempotent: true });
    }
    const extension = sourceUri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const destination = new File(folder, `${generateId('foto')}.${extension}`);
    const source = new File(sourceUri);
    source.copy(destination);
    return destination.uri;
  } catch {
    return sourceUri;
  }
}
