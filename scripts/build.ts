import { createPackageBuilder } from "lionconfig";

await createPackageBuilder(import.meta, {
  packageJsonPath: "../package.json",
  tsconfigPath: "../tsconfig.json",
})
  .cleanDistFolder()
  .tsc()
  .generateBundles({ commonjs: false, typeDefinitions: true })
  .copyPackageFiles()
  .build();
