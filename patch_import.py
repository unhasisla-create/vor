import re
import sys

def patch_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add import statement
    content = content.replace("import type { Vehicle, UserSession } from '@/lib/types'",
                              "import type { Vehicle, UserSession } from '@/lib/types'\nimport VehicleImportModal from './VehicleImportModal'")

    # 2. Add state
    content = content.replace("const [formOpen, setFormOpen] = useState(false)",
                              "const [formOpen, setFormOpen] = useState(false)\n  const [importModalOpen, setImportModalOpen] = useState(false)")

    # 3. Add button
    add_vehicle_btn = "<Btn onClick={openNew}>+ Add Vehicle</Btn>"
    import_btn = """<Btn variant="outline" onClick={() => setImportModalOpen(true)}>Import Excel</Btn>\n                <Btn onClick={openNew}>+ Add Vehicle</Btn>"""
    content = content.replace(add_vehicle_btn, import_btn)

    # 4. Add modal renderer
    modal_code = """      {/* Vehicle Form Modal */}"""
    import_modal = """      <VehicleImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          loadFromServer()
          // Optionally trigger local refresh
        }}
        branches={branchesServer}
        vehicleTypes={vehicleTypesServer}
        customers={customersServer}
        drivers={driversServer}
      />

      {/* Vehicle Form Modal */}"""
    content = content.replace(modal_code, import_modal)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    patch_file(sys.argv[1])
