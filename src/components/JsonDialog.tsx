import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface JsonDialogProps {
  open: boolean;
  onClose: () => void;
  json: any;
}

const JsonDialog: React.FC<JsonDialogProps> = ({ open, onClose, json }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Entry JSON</DialogTitle>
      <DialogContent>
        <SyntaxHighlighter language="json" style={materialLight} showLineNumbers>
          {JSON.stringify(json, null, 2)}
        </SyntaxHighlighter>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JsonDialog;