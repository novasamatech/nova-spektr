import { useUnit } from 'effector-react';

import { referendumDetailsModel } from '../model/referendum-details-model';
import { BaseModal, Plate, FootnoteText, Loader, Markdown } from '@shared/ui';
import { useModalClose } from '@shared/lib/hooks';
import { TrackInfo } from '@entities/governance';

export const ReferendumDetails = () => {
  const index = useUnit(referendumDetailsModel.$index);
  const referendum = useUnit(referendumDetailsModel.$referendum);
  const offChainDetails = `# Sample Markdown Content

  ## Heading Level 2
  
  ### Heading Level 3
  
  #### Heading Level 4
  
  This is a paragraph with **bold text**, *italic text*, and ~~strikethrough text~~.
  
  Here is a list:
  - Item 1
  - Item 2
    - Subitem 2.1
    - Subitem 2.2
  - Item 3
  
  Here is an ordered list:
  1. First item
  2. Second item
  3. Third item
  
  Here is a blockquote:
  > This is a blockquote.
  
  Here is some inline code: \`console.log('Hello, world!');\`
  
  Here is a code block:
  \`\`\`python
  def hello_world():
  print("Hello, world!")
  \`\`\`

Here is a table:

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Row 1    | Data 1   | Data 2   |
| Row 2    | Data 3   | Data 4   |

Here is a link: [OpenAI](https://www.openai.com)

Here is an image:
![Polkadot Logo](https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/icons/v1/chains/Polkadot.svg)
![Broken Logo](https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main)

Here is a horizontal rule:

---

Here is a task list:
- [x] Task 1
- [ ] Task 2
- [ ] Task 3

## Conclusion

This is the end of the sample markdown content.
  `;
  const isDetailsLoading = useUnit(referendumDetailsModel.$isDetailsLoading);

  const [isModalOpen, closeModal] = useModalClose(Boolean(referendum), referendumDetailsModel.output.flowClosed);

  if (!index || !referendum) return null;

  return (
    <BaseModal
      isOpen={isModalOpen}
      title={`Referendum #${index}`}
      contentClass="min-h-0 h-full w-full bg-main-app-background overflow-y-auto"
      panelClass="flex flex-col w-[944px] h-[678px]"
      headerClass="pl-5 pr-3 py-4 shrink-0"
      closeButton
      onClose={closeModal}
    >
      <div className="ref-details flex flex-wrap-reverse items-end gap-4 p-6 min-h-full">
        <div className="h-full min-h-0 grow min-w-80 basis-[530px]">
          <Plate className="shadow-card-shadow border-filter-border h-fit p-6">
            <div className="flex justify-between items-center mb-4">
              <FootnoteText className="text-text-secondary">Proposer: XXX</FootnoteText>
              <TrackInfo trackId={referendum.track} />
            </div>

            {isDetailsLoading && (
              <div className="flex justify-center items-center min-h-32">
                <Loader color="primary" size={25} />
              </div>
            )}

            {!isDetailsLoading && offChainDetails && <Markdown>{offChainDetails}</Markdown>}
          </Plate>
        </div>

        {/*<div className="flex flex-row flex-wrap gap-4 basis-[350px] grow shrink-0">*/}
        {/*  <Plate className="p-6 shadow-card-shadow border-filter-border grow basis-[350px]">Votes</Plate>*/}

        {/*  <Plate className="p-6 shadow-card-shadow border-filter-border grow basis-[350px]">Summary</Plate>*/}

        {/*  <Plate className="p-6 shadow-card-shadow border-filter-border grow basis-[350px]">Additional</Plate>*/}

        {/*  <Plate className="p-6 shadow-card-shadow border-filter-border grow basis-[350px]">Timeline</Plate>*/}

        {/*  <Plate className="p-6 shadow-card-shadow border-filter-border grow basis-[350px]">Advanced</Plate>*/}
        {/*</div>*/}
      </div>
    </BaseModal>
  );
};
