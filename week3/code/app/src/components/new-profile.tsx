"use client";

import useAnchorProvider from "@/hooks/use-anchor-provider";
import TodoProgram from "@/lib/todo-program";
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  Input,
  useToast,
} from "@chakra-ui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function NewProfile() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const provider = useAnchorProvider();

  const { isPending, mutateAsync } = useMutation({
    mutationKey: ["create-profile"],
    mutationFn: async (name: string) => {
      if (!provider || !provider.publicKey) {
        throw new Error("Wallet not connected");
      }
      console.log("Wallet public key:", provider?.publicKey?.toBase58());

      // const program = new TodoProgram(provider);
      // const tx = await program.createProfile(name);
      // const signature = await provider.sendAndConfirm(tx);

      // return signature;

       const program = new TodoProgram(provider);
      const signature = await program.createProfile(name);

        return signature
    },
    onSuccess: async (tx) => {
      toast({
        title: "Profile created successfully",
        description: `Transaction: ${tx}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      if (provider?.publicKey) {
        await queryClient.invalidateQueries({
          queryKey: ["profile", provider.publicKey.toBase58()],
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create profile",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      console.error(error);
    },
    onSettled: () => {
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await mutateAsync(name);
  };

  const isWalletReady = provider && provider.publicKey;

  return (
    <>
      <Button onClick={onOpen} colorScheme="blue" isDisabled={!isWalletReady}>
        New profile
      </Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent as="form" onSubmit={handleSubmit}>
          <ModalHeader>New profile</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl isDisabled={!isWalletReady}>
              <FormLabel>Name</FormLabel>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>Cancel</Button>
            <Button
              isLoading={isPending}
              type="submit"
              colorScheme="blue"
              loadingText="Creating"
              ml={3}
              isDisabled={!isWalletReady || !name}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
