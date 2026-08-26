interface FileDescriptor {
  name: string;
  type: string;
}

export function isHtmlFile(file: FileDescriptor): boolean {
  const lowerName = file.name.toLowerCase();
  return (
    file.type === "text/html" ||
    lowerName.endsWith(".html") ||
    lowerName.endsWith(".htm")
  );
}
