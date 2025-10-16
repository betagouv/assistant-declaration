import { searchCompanySuggestions } from '@ad/src/client/api-gouv-fr';
import { searchAddressSuggestions } from '@ad/src/client/national-address-base';
import { prisma } from '@ad/src/prisma/client';
import { workaroundAssert as assert } from '@ad/src/utils/assert';
import { sleep } from '@ad/src/utils/sleep';

async function main() {
  const organizations = await prisma.organization.findMany({
    where: {
      OR: [
        {
          officialHeadquartersId: null as any, // Casted since no longer truc for linter
        },
        {
          headquartersAddressId: null as any, // Casted since no longer truc for linter
        },
      ],
    },
    select: {
      id: true,
      name: true,
      officialId: true,
    },
  });

  for (const organization of organizations) {
    console.log(`[${organization.officialId}] starting`);

    const companySuggestions = await searchCompanySuggestions(organization.officialId);
    const expectedCompany = companySuggestions.find((companySuggestion) => companySuggestion.officialId === organization.officialId);

    assert(expectedCompany, 'no company found');
    assert(expectedCompany.inlineHeadquartersAddress !== '', 'raw address empty');

    const headquartersAddressSuggestions = await searchAddressSuggestions(expectedCompany.inlineHeadquartersAddress);

    assert(headquartersAddressSuggestions.length > 0, 'no registered address found');

    const headquartersAddress = headquartersAddressSuggestions[0];

    await prisma.organization.update({
      where: {
        id: organization.id,
      },
      data: {
        officialHeadquartersId: expectedCompany.officialHeadquartersId,
        headquartersAddress: {
          create: {
            street: headquartersAddress.street,
            city: headquartersAddress.city,
            postalCode: headquartersAddress.postalCode,
            subdivision: headquartersAddress.subdivision,
            countryCode: headquartersAddress.countryCode,
          },
        },
      },
    });

    console.log(`[${organization.officialId} -> ${expectedCompany.officialHeadquartersId}] patched`);
    console.log(JSON.stringify(headquartersAddress));

    await sleep(300);
  }
}

main();
