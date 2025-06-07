type copyToClipboardProps = {
  text: string;
  toast: any;
};

export default function copyToClipboard ({text, toast}: copyToClipboardProps) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      toast.success("CID copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy CID:", err);
      toast.error("Failed to copy CID.");
    });
};