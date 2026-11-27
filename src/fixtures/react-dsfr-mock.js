// ESM mock for @codegouvfr/react-dsfr

let mockIdCounter = 0;

export const fr = {
  cx: (...classNames) => classNames.filter(Boolean).join(' '),
};

export const Input = ({ label, disabled, state, stateRelatedMessage, nativeInputProps, id }) => {
  const inputId = id || `mock-input-${++mockIdCounter}`;
  return (
    <div>
      {label && <label htmlFor={inputId}>{label}</label>}
      <input id={inputId} {...nativeInputProps} disabled={disabled} data-state={state} />
      {stateRelatedMessage && <span data-testid="input-error">{stateRelatedMessage}</span>}
    </div>
  );
};

export const Button = ({ children, iconId, ...props }) => {
  return <button {...props}>{children}</button>;
};

export const Badge = ({ children, ...props }) => {
  return <span {...props}>{children}</span>;
};

export const Alert = ({ title, description, children, ...props }) => {
  return (
    <div role="alert" {...props}>
      {title && <p data-testid="alert-title">{title}</p>}
      {description && <p data-testid="alert-description">{description}</p>}
      {children}
    </div>
  );
};
