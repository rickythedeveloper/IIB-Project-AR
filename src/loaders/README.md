# Loader requirements
## Visualization Toolkit (VTK)
### VTPLoader (.vtp)
- Data is appended
- Appended data is encoded (base64)
- File is uncompressed
- CellData, Verts, Lines, Strips are unused

### VTSLoader (.vts)
- Data is appended
- Appended data is encoded (base64)
- File is uncompressed
- CellData is unused

### VTKLoader (.vtk)
- Use three.js example
- File format is legacy
- Data type is PolyData
- Not actively supported