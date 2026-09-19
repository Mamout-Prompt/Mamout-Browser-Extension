interface DeleteConfirmationDialogProps {
  onConfirm: () => void;
  onDismiss: () => void;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  onConfirm,
  onDismiss,
}) => {
  return (
    <div className="dialog-overlay" onClick={onDismiss}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">Delete prompt</h3>
        <p className="dialog-text">
          Are you sure you want to delete this prompt? This action cannot be undone.
        </p>
        <div className="dialog-actions">
          <button className="btn btn-text" onClick={onDismiss}>
            Cancel
          </button>
          <button className="btn btn-text btn-error" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
