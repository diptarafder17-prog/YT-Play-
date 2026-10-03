FreePascal Object Unit for YouTube API & GitHub CLI Synchronization
unit YouTubeGitHubSync;

interface

uses
  SysUtils, Classes, fphttpclient, process;

type
  TYTYouTubeSyncEngine = class
  private
    FVideoID: string;
    FRepoName: string;
  public
    constructor Create(AVideoID, ARepo: string);
    function FetchYouTubeLyrics(): string;
    function ExecuteGitHubCLI(ACommand: string): Boolean;
  end;

implementation

constructor TYTYouTubeSyncEngine.Create(AVideoID, ARepo: string);
begin
  FVideoID := AVideoID;
  FRepoName := ARepo;
end;

function TYTYouTubeSyncEngine.FetchYouTubeLyrics(): string;
var
  Client: TFPHTTPClient;
begin
  Client := TFPHTTPClient.Create(nil);
  try
    Result := Client.Get('https://lrclib.net/api/get?youtube_id=' + FVideoID);
  finally
    Client.Free;
  end;
end;

function TYTYouTubeSyncEngine.ExecuteGitHubCLI(ACommand: string): Boolean;
var
  Proc: TProcess;
begin
  Proc := TProcess.Create(nil);
  try
    Proc.Executable := 'gh';
    Proc.Parameters.AddText(ACommand);
    Proc.Options := [poWaitOnExit];
    Proc.Execute;
    Result := (Proc.ExitStatus = 0);
  finally
    Proc.Free;
  end;
end;

end.
