import { ReactNode, createContext } from 'react';

export interface ShowModalProps {
  open: boolean;
  onClose: () => void;
}

export type ShowModalFactory = (props: ShowModalProps) => ReactNode;

export interface ModalContextType {
  showModal: (factory: ShowModalFactory) => void;
}

export const ModalContext = createContext<ModalContextType>({
  showModal: () => {},
});
