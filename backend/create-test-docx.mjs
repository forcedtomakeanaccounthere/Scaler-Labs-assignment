import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";

const zip = new AdmZip();

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri"/></w:rPr></w:rPrDefault></w:docDefaults>
</w:styles>`;

const coreProps = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>Test Redact</dc:title><dc:creator>Test</dc:creator>
</cp:coreProperties>`;

const appProps = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>TestApp</Application>
</Properties>`;

function makeParagraph(text) {
  const runs = text
    .split(/(\b(?:[\w.+-]+@[\w-]+\.[\w.-]+)\b|\+?\d[\d\s-]{8,}\d|\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b|\b\d{2}-\d{2}-\d{4}\b)/g)
    .filter(Boolean)
    .map(part => `<w:r><w:t xml:space="preserve">${part.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</w:t></w:r>`)
    .join("");
  return `<w:p>${runs}</w:p>`;
}

const paragraphs = [
  "RED HERRING PROSPECTUS",
  "Confidential Document - Draft",
  "",
  "Company: Acme Technologies Pvt. Ltd.",
  "Registered Office: 123 Main Street, Bengaluru, Karnataka 560001",
  "",
  "DIRECTORS:",
  "1. Mr. Rajesh Kumar - Email: rajesh.kumar@acmetech.in, Phone: +91 98765 43210",
  "2. Mrs. Priya Sharma - Email: priya.sharma@acmetech.in, DOB: 15-08-1985",
  "3. Dr. Arun Mehta - Aadhaar: 1234 5678 9012, PAN: ABCDE1234F",
  "",
  "INVESTOR CONTACTS:",
  "Name: Mr. Rahul Verma",
  "Email: rahul.verma@investments.com",
  "Mobile: 98110 12345",
  "IP Address logged: 192.168.1.101",
  "",
  "Credit Card (test): 4111 1111 1111 1111",
  "SSN (sample): 123-45-6789",
  "Passport No: Z1234567",
  "Driving License: DL-05 19850123456",
  "",
  "This document contains sensitive personally identifiable information.",
  "All PII must be redacted before public distribution.",
];

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.map(makeParagraph).join("")}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr>
  </w:body>
</w:document>`;

zip.addFile("[Content_Types].xml", Buffer.from(contentTypes, "utf-8"));
zip.addFile("_rels/.rels", Buffer.from(rels, "utf-8"));
zip.addFile("word/_rels/document.xml.rels", Buffer.from(docRels, "utf-8"));
zip.addFile("word/document.xml", Buffer.from(documentXml, "utf-8"));
zip.addFile("word/styles.xml", Buffer.from(styles, "utf-8"));
zip.addFile("docProps/core.xml", Buffer.from(coreProps, "utf-8"));
zip.addFile("docProps/app.xml", Buffer.from(appProps, "utf-8"));

const outDir = process.cwd();
const outPath = path.join(outDir, "test-pii-sample.docx");
zip.writeZip(outPath);

console.log(`Created: ${outPath} (${fs.statSync(outPath).size} bytes)`);
