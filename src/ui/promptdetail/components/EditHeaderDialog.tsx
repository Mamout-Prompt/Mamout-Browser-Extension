interface EditHeaderDialogProps {
  title: string;
  description: string;
  onTitleChange: (newTitle: string) => void;
  onDescriptionChange: (newDesc: string) => void;
  onDismiss: () => void;
}

export const EditHeaderDialog: React.FC<EditHeaderDialogProps> = ({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onDismiss,
}) => {
  return (
    <div className="dialog-overlay" onClick={onDismiss}>
      <div className="dialog-card edit-header-dialog" onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">Edit Details</h3>
        
        <div className="dialog-body space-y-3">
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              type="text"
              className="dialog-input"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="dialog-textarea"
              rows={3}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>
        </div>

        <div className="dialog-actions">
          <button className="btn btn-text" onClick={onDismiss}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
