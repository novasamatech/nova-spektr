export {};
// import React, { useContext, useRef, useState } from 'react';
// import { BaseModal, Button } from '@renderer/components/ui';

// type UseModalShowReturnType = {
//   show: boolean;
//   setShow: (value: boolean) => void;
//   onHide: () => void;
// };

// const useModalShow = (): UseModalShowReturnType => {
//   const [show, setShow] = useState(false);

//   const handleOnHide = () => {
//     setShow(false);
//   };

//   return {
//     show,
//     setShow,
//     onHide: handleOnHide,
//   };
// };

// type ModalContextType = {
//   showConfirmation: (title: string, message: string | JSX.Element) => Promise<boolean>;
// };

// type ConfirmContextProviderProps = {
//   children: React.ReactNode;
// };

// const ConfirmContext = React.createContext<ModalContextType>({} as ModalContextType);

// const ConfirmContextProvider = (props: ConfirmContextProviderProps) => {
//   const { setShow, show, onHide } = useModalShow();
//   const [content, setContent] = useState<{ title: string; message: string | JSX.Element } | null>();
//   const resolver = useRef<Function>();

//   const handleShow = (title: string, message: string | JSX.Element): Promise<boolean> => {
//     setContent({
//       title,
//       message,
//     });
//     setShow(true);

//     return new Promise(function (resolve) {
//       resolver.current = resolve;
//     });
//   };

//   const modalContext: ModalContextType = {
//     showConfirmation: handleShow,
//   };

//   const handleConfirm = () => {
//     resolver.current && resolver.current(true);
//     onHide();
//   };

//   const handleClose = () => {
//     resolver.current && resolver.current(false);
//     onHide();
//   };

//   return (
//     <ConfirmContext.Provider value={modalContext}>
//       <>
//         {children}
//         <BaseModal isOpen={show} onClose={onHide}>
//           {content}
//           <div className="grid grid-cols-2 gap-x-3">
//             <Button variant="outline" pallet="primary" onClick={handleClose}>
//               Cancel
//             </Button>
//             <Button variant="fill" pallet="primary" onClick={handleConfirm}>
//               Confirm
//             </Button>
//           </div>
//         </BaseModal>
//       </>
//     </ConfirmContext.Provider>
//   );
// };

// const useConfirmContext = (): ModalContextType => useContext(ConfirmContext);

// export { useModalShow, useConfirmContext };

// export default ConfirmContextProvider;
