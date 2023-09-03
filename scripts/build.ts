import { createPackageBuilder } from "lionconfig";

await createPackageBuilder(import.meta, {
  packageJsonPath: "../package.json",
  tsconfigPath: "../tsconfig.json",
})
  .cleanDistFolder()
  .tsc()
  .generateBundles({ commonjs: true, typeDefinitions: true })
  .copyPackageFiles()
  .build();
