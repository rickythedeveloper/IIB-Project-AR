# Loader requirements
## Visualization Toolkit (VTK)
### VTPLoader (.vtp)
- 'appended' data array format has been tested. 'binary' & 'ascii' data array formats are yet to be tested
- Appended data is encoded (base64) if there is any
- File is uncompressed
- CellData, Verts, Lines, Strips are unused

### VTSLoader (.vts)
- 'appended' data array format has been tested. 'binary' & 'ascii' data array formats are yet to be tested
- Appended data is encoded (base64) if there is any
- File is uncompressed
- CellData is unused

### VTKLoader (.vtk)
- Use three.js example
- File format is legacy
- Data type is PolyData
- Not actively supported